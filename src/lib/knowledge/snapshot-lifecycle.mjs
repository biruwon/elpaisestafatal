export const snapshotLifecycle = (policy = {}, now = Date.now()) => {
  const createdAt = Date.parse(policy.createdAt || '');
  const expiresAt = Date.parse(policy.expiresAt || '');
  if (!Number.isFinite(createdAt) || !Number.isFinite(expiresAt)) return { status: 'invalid', usable: false, reason: 'El snapshot no tiene fechas válidas.' };
  if (expiresAt <= createdAt) return { status: 'invalid', usable: false, reason: 'La fecha de caducidad no es posterior a la creación.' };
  if (policy.validationStatus === 'expired' || expiresAt <= now) return { status: 'expired', usable: false, reason: `El snapshot caducó el ${policy.expiresAt}.` };
  if (policy.validationStatus !== 'reviewed') return { status: 'unreviewed', usable: false, reason: 'El snapshot no está revisado para uso factual.' };
  return { status: 'current', usable: true, reason: '' };
};
