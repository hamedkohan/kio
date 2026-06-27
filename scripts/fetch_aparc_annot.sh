#!/usr/bin/env bash
# Obtain the real FreeSurfer Desikan-Killiany parcellation (fsaverage5) so the
# brain mesh generator switches from the approximate demo parcellation to the
# official atlas — with no code change.
#
# The generator (scripts/generate_brain_meshes.py) auto-detects these files:
#     scripts/lh.aparc.annot
#     scripts/rh.aparc.annot
# and flips mesh.parcellation_source to "freesurfer_aparc".
#
# Source priority:
#   1. A local FreeSurfer install  ($FREESURFER_HOME/subjects/fsaverage5/label)
#   2. Explicit URLs               (APARC_LH_URL / APARC_RH_URL env vars)
#   3. Otherwise: manual-download instructions
#
# Usage:
#   bash scripts/fetch_aparc_annot.sh
#   APARC_LH_URL=https://… APARC_RH_URL=https://… bash scripts/fetch_aparc_annot.sh
set -euo pipefail
DEST="$(cd "$(dirname "$0")" && pwd)"

copy_from_freesurfer() {
  local label="${FREESURFER_HOME:-}/subjects/fsaverage5/label"
  if [[ -n "${FREESURFER_HOME:-}" && -f "$label/lh.aparc.annot" && -f "$label/rh.aparc.annot" ]]; then
    cp "$label/lh.aparc.annot" "$DEST/lh.aparc.annot"
    cp "$label/rh.aparc.annot" "$DEST/rh.aparc.annot"
    echo "Copied DK aparc.annot from \$FREESURFER_HOME (fsaverage5)."
    return 0
  fi
  return 1
}

download_from_urls() {
  if [[ -n "${APARC_LH_URL:-}" && -n "${APARC_RH_URL:-}" ]]; then
    curl -fSL "$APARC_LH_URL" -o "$DEST/lh.aparc.annot"
    curl -fSL "$APARC_RH_URL" -o "$DEST/rh.aparc.annot"
    echo "Downloaded DK aparc.annot from provided URLs."
    return 0
  fi
  return 1
}

if copy_from_freesurfer || download_from_urls; then
  echo "Done. Now run:  npm run gen:meshes"
  exit 0
fi

cat <<'EOF'
Could not obtain lh/rh.aparc.annot automatically.

The Desikan-Killiany aparc.annot for fsaverage5 ships with FreeSurfer:
    $FREESURFER_HOME/subjects/fsaverage5/label/lh.aparc.annot
    $FREESURFER_HOME/subjects/fsaverage5/label/rh.aparc.annot

Options:
  • Install FreeSurfer and re-run this script (it copies from $FREESURFER_HOME), or
  • Provide direct URLs:
        APARC_LH_URL=… APARC_RH_URL=… bash scripts/fetch_aparc_annot.sh
  • Or copy the two files manually into ./scripts/

Then run:  npm run gen:meshes
The generator will detect them and produce real-atlas per-region meshes
(mesh.parcellation_source = "freesurfer_aparc").
EOF
exit 1
