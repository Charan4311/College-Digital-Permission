const crypto = require('crypto');
const OutpassRequest = require('../models/OutpassRequest');

const normalizeLegacyReference = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const formatReferenceId = (value) => {
  const normalized = normalizeLegacyReference(value);
  if (!normalized) return null;
  return normalized.toUpperCase();
};

async function generateUniqueReferenceId(excludedId = null) {
  const year = new Date().getFullYear().toString();
  let attempts = 0;

  while (attempts < 25) {
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    const candidate = `PERM-${year}-${suffix}`;
    const query = { referenceId: candidate };

    if (excludedId) {
      query._id = { $ne: excludedId };
    }

    const existing = await OutpassRequest.findOne(query);

    if (!existing) return candidate;
    attempts += 1;
  }

  throw new Error('Unable to generate a unique reference ID after multiple attempts.');
}

async function normalizeReferenceIds() {
  const requests = await OutpassRequest.find({}).sort({ createdAt: 1 });
  const seen = new Set();
  let updatedCount = 0;

  for (const request of requests) {
    const current = formatReferenceId(request.referenceId);

    if (current && /^PERM-\d{4}-[A-F0-9]{6}$/.test(current) && !seen.has(current)) {
      seen.add(current);
      continue;
    }

    const next = await generateUniqueReferenceId(request._id);
    await OutpassRequest.findByIdAndUpdate(request._id, { referenceId: next });
    seen.add(next);
    updatedCount += 1;
  }

  if (updatedCount > 0) {
    console.log(`[REFERENCE-ID] Normalized ${updatedCount} legacy or duplicate request reference IDs.`);
  }

  return updatedCount;
}

module.exports = {
  generateUniqueReferenceId,
  normalizeReferenceIds
};
