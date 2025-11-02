#!/bin/zsh

# Fast dump of all files from pages/api/notifications
# Only writes to notifications_dump.txt (no terminal output)
# Handles spaces and special characters in filenames

OUTPUT_FILE="notifications_dump.txt"
> "$OUTPUT_FILE"  # truncate/create output file

n=1

find pages/api/notifications -type f -print0 | while IFS= read -r -d '' file; do
    echo "===== File #$n: $file =====" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo -e "\n" >> "$OUTPUT_FILE"
    ((n++))
done
