#!/bin/sh
# Scarica le skill di design usate per l'interfaccia in .claude/skills/ (cartella esclusa da git).
# Versioni fissate a un commit, così il risultato è riproducibile.
#
#   impeccable    https://github.com/pbakaus/impeccable          (Apache 2.0)
#   apple-design  https://github.com/dickwu/apple-design-skill   (nessuna licenza dichiarata: per questo non la copiamo nel repo)
#
# Uso: sh scripts/setup-skills.sh
set -eu
cd "$(dirname "$0")/.."
DEST=.claude/skills
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$DEST"

fetch() { # repo commit dir
  git clone -q https://github.com/"$1" "$TMP/$3"
  git -C "$TMP/$3" checkout -q "$2"
}

fetch pbakaus/impeccable b4bff1626c344067788c2679f048a20057c7cc5a impeccable
rm -rf "$DEST/impeccable" && cp -R "$TMP/impeccable/plugin/skills/impeccable" "$DEST/impeccable"

fetch dickwu/apple-design-skill ff4ebddf0488598723a82bfdce1afb04de0b1c44 apple-design
rm -rf "$DEST/apple-design" && mkdir -p "$DEST/apple-design"
cp -R "$TMP/apple-design/SKILL.md" "$TMP/apple-design/references" "$DEST/apple-design/"

echo "Skill pronte in $DEST: impeccable, apple-design"
