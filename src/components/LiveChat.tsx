'use client';

// Live chat was removed from the storefront at the owner's request — the
// floating bubble, its polling panel and the feature_livechat switch are all
// gone, and nothing imports this component anymore. The file remains only
// because the snapshot-based deploy pipeline cannot delete files; it renders
// nothing and is safe to delete by hand in the repo.
export default function LiveChat() {
  return null;
}
