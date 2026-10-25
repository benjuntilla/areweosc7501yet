#!/usr/bin/env bash
# Fails if stdin carries an attribution line: any Co-Authored-By trailer, a
# "Generated with …" line, a Claude-Session link or the robot emoji. Product
# names alone are fine, since entries like claude-code are real data.
if grep -qiE 'co-authored-by:|generated with|claude-session|🤖'; then
  echo "::error::$1 carries an attribution line"
  exit 1
fi
