#!/bin/zsh

# Script to dump all files from pages/api/notifications
# with numbering, safe handling of spaces, 
# prints to terminal and saves to notifications_dump.txt

OUTPUT_FILE="notifications_dump.txt"
> "$OUTPUT_FILE"  # truncate/create output file

n=1

# Find all files safely (handles spaces)
find pages/api/notifications -type f -print0 | while IFS= read -r -d '' file; do
    echo "===== File #$n: $file =====" | tee -a "$OUTPUT_FILE"
    cat "$file" | tee -a "$OUTPUT_FILE"
    echo -e "\n" | tee -a "$OUTPUT_FILE"
    ((n++))
done
