interface Env { RESEND_API_KEY: string; CONTACT_TO_EMAIL: string; TURNSTILE_SECRET_KEY?: string }
interface Context { request: Request; env: Env }

export const onRequestPost = async ({ request, env }: Context): Promise<Response> => {
  const data = await request.formData();
  const email = String(data.get('email') || '').slice(0, 254);
  const message = String(data.get('message') || '').trim().slice(0, 5000);
  const company = String(data.get('company') || '');
  if (company || message.length < 10) return new Response('Solicitud no válida', { status: 400 });
  if (env.TURNSTILE_SECRET_KEY) {
    const token = String(data.get('cf-turnstile-response') || '');
    const verification = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, remoteip: request.headers.get('CF-Connecting-IP') || '' }) });
    const result = await verification.json() as { success?: boolean };
    if (!result.success) return new Response('No se pudo verificar el envío.', { status: 400 });
  }
  if (!env.RESEND_API_KEY || !env.CONTACT_TO_EMAIL) return new Response('El formulario todavía no está configurado.', { status: 503 });
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: 'Contacto <onboarding@resend.dev>', to: [env.CONTACT_TO_EMAIL], reply_to: email || undefined, subject: 'Mensaje desde elpaisestafatal.es', text: `Correo: ${email || 'No indicado'}\n\n${message}` }) });
  if (!response.ok) return new Response('No se pudo enviar el mensaje.', { status: 502 });
  return Response.redirect(new URL('/contacto?enviado=1', request.url), 303);
};
