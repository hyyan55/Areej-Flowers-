// supabase/functions/send-message/index.ts
//
// ============================================================
//  دالة Edge Function اختيارية — غير موصولة افتراضياً
// ============================================================
//  ماذا تفعل؟
//  تستقبل رسالة تواصل (name, subject, body)، تتحقق منها، وتفرض حد
//  5 رسائل / 10 دقائق لكل IP قبل إدخالها في جدول messages.
//
//  لماذا هي اختيارية؟
//  الحد الحالي في index.html محلي فقط (localStorage) ويمكن تجاوزه
//  بسهولة من أي متصفح آخر. هذه الدالة تنقل الحد إلى الخادم حيث لا
//  يمكن تجاوزه. الموقع يعمل بدونها؛ هي طبقة حماية إضافية فقط.
//
//  المتطلبات قبل النشر (مرة واحدة):
//  1) أنشئ جدولاً صغيراً لتتبع معدل الإرسال لكل IP (يخزن بصمة IP
//     مشفرة فقط، لا عناوين IP خام). نفذ في SQL Editor:
//        create table if not exists public.message_rate_limits (
//          id bigint generated always as identity primary key,
//          ip_hash text not null,
//          created_at timestamptz not null default now()
//        );
//        -- تنظيف تلقائي للصفوف الأقدم من ساعة (اختياري):
//        -- create index if not exists message_rate_limits_ip_created
//        --   on public.message_rate_limits (ip_hash, created_at);
//     ملاحظة: هذا الجدول يُستخدم من الدالة فقط عبر مفتاح service_role،
//     فلا حاجة لسياسات RLS عليه للمجهول (ولا تُنشئها).
//  2) لا حاجة لإعداد أسرار يدوياً: SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY
//     متاحان تلقائياً لدوال Edge في نفس المشروع.
//
//  النشر:
//        supabase functions deploy send-message
//  (من مجلد المشروع بعد `supabase link --project-ref brpfiahribknkoqxzcch`)
//
//  التفعيل في index.html (بعد النشر فقط):
//  في معالج نموذج التواصل، استبدل الاستدعاء الحالي:
//        await put('messages', {name, subject, body, createdAt: now, read: false});
//  بهذا الاستدعاء:
//        const res = await fetch(SUPABASE_URL + '/functions/v1/send-message', {
//          method: 'POST',
//          headers: {'Content-Type': 'application/json',
//                    'apikey': SUPABASE_PUBLISHABLE_KEY,
//                    'Authorization': 'Bearer ' + SUPABASE_PUBLISHABLE_KEY},
//          body: JSON.stringify({name, subject, body, website: hp})
//        });
//        if (res.status === 429) return fail(t('form.rate'));
//        if (!res.ok) throw new Error('تعذر إرسال الرسالة.');
//  وأبقِ فحص honeypot والحد المحلي كما هما — هما خط الدفاع الأول.
//
//  تنبيه أمني:
//  مفتاح service_role يُقرأ هنا من متغيرات بيئة الخادم فقط، ولا يظهر
//  أبداً في index.html أو في أي كود يعمل في المتصفح.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RATE_LIMIT = 5; // رسائل كحد أقصى
const RATE_WINDOW_MS = 10 * 60 * 1000; // خلال 10 دقائق

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function validText(value: unknown, min: number, max: number): value is string {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  try {
    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== 'object') return json({ error: 'invalid_body' }, 400);
    const { name, subject, body, website } = payload as Record<string, unknown>;

    // Honeypot: إن امتُلئ الحقل المخفي فهو بوت — تظاهر بالنجاح ولا تخزن شيئاً.
    if (typeof website === 'string' && website.trim() !== '') return json({ ok: true });

    if (!validText(name, 2, 80)) return json({ error: 'invalid_name' }, 400);
    if (!validText(subject, 2, 120)) return json({ error: 'invalid_subject' }, 400);
    if (!validText(body, 5, 5000)) return json({ error: 'invalid_body' }, 400);

    // عنوان IP من الطلب (أول قيمة في x-forwarded-for)، يُخزن مشفراً فقط.
    const forwarded = req.headers.get('x-forwarded-for') || '';
    const ip = forwarded.split(',')[0].trim() || 'unknown';
    const ipHash = await sha256Hex(ip);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) return json({ error: 'server_misconfigured' }, 500);
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // حد المعدل: عدّ محاولات هذا الـ IP خلال آخر 10 دقائق قبل أي إدخال.
    const since = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count, error: countError } = await supabase
      .from('message_rate_limits')
      .select('id', { count: 'exact', head: true })
      .eq('ip_hash', ipHash)
      .gt('created_at', since);
    if (countError) throw countError;
    if ((count ?? 0) >= RATE_LIMIT) return json({ error: 'rate_limited' }, 429);

    // الإدخال في جدول messages (نفس الأعمدة التي يستخدمها الموقع).
    const { error: insertError } = await supabase.from('messages').insert({
      name: (name as string).trim(),
      subject: (subject as string).trim(),
      body: (body as string).trim(),
      is_read: false,
    });
    if (insertError) throw insertError;

    // سجّل هذه الرسالة في عدّاد معدل الإرسال (فقط بعد نجاح الإدخال).
    const { error: logError } = await supabase
      .from('message_rate_limits')
      .insert({ ip_hash: ipHash });
    if (logError) console.error('rate-limit log failed:', logError.message);

    return json({ ok: true });
  } catch (err) {
    console.error('send-message error:', err);
    return json({ error: 'internal_error' }, 500);
  }
});
