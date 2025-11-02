#!/bin/zsh

OUTPUT_FILE="notifications_dump.txt"
> "$OUTPUT_FILE"  # truncate/create output file

n=1

# Use a zsh-friendly loop to avoid subshell issues
while IFS= read -r -d '' file; do
    echo "===== File #$n: $file =====" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo -e "\n" >> "$OUTPUT_FILE"
    ((n++))
done < <(find pages/api/notifications -type f -print0)

echo "Dump completed: $OUTPUT_FILE"
