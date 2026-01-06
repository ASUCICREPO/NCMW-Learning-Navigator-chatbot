#!/usr/bin/env python3
"""
Extract hyperlinks from PDF files and create a reference document.
This script extracts URLs from PDF annotations and creates a markdown document
that can be uploaded to the knowledge base.
"""

import sys
import os
from PyPDF2 import PdfReader
from collections import defaultdict
import json

def extract_urls_from_pdf(pdf_path):
    """
    Extract all URLs from a PDF file including:
    - Link annotations
    - URI actions
    - Text that looks like URLs
    """
    urls = []

    try:
        reader = PdfReader(pdf_path)

        for page_num, page in enumerate(reader.pages, 1):
            # Extract annotations (hyperlinks)
            if '/Annots' in page:
                annotations = page['/Annots']

                for annotation in annotations:
                    try:
                        obj = annotation.get_object()

                        # Check for URI links
                        if '/A' in obj:
                            action = obj['/A']
                            if '/URI' in action:
                                url = action['/URI']

                                # Get the link text if available
                                link_text = ""
                                if '/Contents' in obj:
                                    link_text = obj['/Contents']
                                elif '/T' in obj:
                                    link_text = obj['/T']

                                urls.append({
                                    'url': url,
                                    'text': link_text,
                                    'page': page_num,
                                    'type': 'annotation'
                                })
                    except Exception as e:
                        print(f"  Warning: Could not parse annotation on page {page_num}: {e}", file=sys.stderr)

            # Extract text and look for URL patterns
            try:
                text = page.extract_text()
                import re
                url_pattern = r'https?://[^\s<>"{}|\\^`\[\]]+'
                found_urls = re.findall(url_pattern, text)

                for url in found_urls:
                    # Clean up URL (remove trailing punctuation)
                    url = url.rstrip('.,;:)')
                    urls.append({
                        'url': url,
                        'text': '',
                        'page': page_num,
                        'type': 'text'
                    })
            except Exception as e:
                print(f"  Warning: Could not extract text from page {page_num}: {e}", file=sys.stderr)

    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}", file=sys.stderr)
        return []

    return urls

def create_url_reference_document(pdf_files, output_path):
    """
    Create a markdown reference document with all extracted URLs.
    """
    all_urls = {}

    for pdf_path in pdf_files:
        print(f"Processing {os.path.basename(pdf_path)}...")
        urls = extract_urls_from_pdf(pdf_path)
        all_urls[os.path.basename(pdf_path)] = urls
        print(f"  Found {len(urls)} URLs")

    # Create markdown document
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("# MHFA Learning Navigator - URL Reference Guide\n\n")
        f.write("This document contains all hyperlinks and URLs extracted from MHFA knowledge base documents.\n\n")
        f.write("---\n\n")

        for pdf_name, urls in all_urls.items():
            if not urls:
                continue

            f.write(f"## {pdf_name}\n\n")

            # Deduplicate URLs
            unique_urls = {}
            for url_info in urls:
                url = url_info['url']
                if url not in unique_urls:
                    unique_urls[url] = url_info

            for url, info in unique_urls.items():
                if info['text']:
                    f.write(f"- **{info['text']}**: [{url}]({url}) (Page {info['page']})\n")
                else:
                    f.write(f"- [{url}]({url}) (Page {info['page']})\n")

            f.write("\n")

        # Add common MHFA URLs section
        f.write("## Common MHFA Resources\n\n")
        f.write("### Official Websites\n")
        f.write("- **MHFA Connect Platform**: https://www.mhfaconnect.org/\n")
        f.write("- **Mental Health First Aid Main Site**: https://www.mentalhealthfirstaid.org/\n")
        f.write("- **National Council for Mental Wellbeing**: https://www.thenationalcouncil.org/\n\n")

        f.write("### Support Forms\n")
        f.write("- **Request Assistance Form**: https://www.mentalhealthfirstaid.org/request-assistance/\n")
        f.write("- **Contact Support**: https://www.mentalhealthfirstaid.org/contact/\n\n")

        f.write("### Training Resources\n")
        f.write("- **Find a Course**: https://www.mentalhealthfirstaid.org/take-a-course/\n")
        f.write("- **Become an Instructor**: https://www.mentalhealthfirstaid.org/become-an-instructor/\n\n")

    print(f"\n✓ Created reference document: {output_path}")

    # Also create JSON version for programmatic access
    json_path = output_path.replace('.md', '.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(all_urls, f, indent=2)
    print(f"✓ Created JSON version: {json_path}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 extract_pdf_urls.py <pdf_file1> [pdf_file2] ...")
        print("\nExample:")
        print("  python3 extract_pdf_urls.py knowledge_base/*.pdf")
        print("\nThis will create 'mhfa_url_reference.md' with all extracted URLs")
        sys.exit(1)

    pdf_files = sys.argv[1:]

    # Validate files
    valid_files = []
    for pdf_path in pdf_files:
        if not os.path.exists(pdf_path):
            print(f"Warning: File not found: {pdf_path}", file=sys.stderr)
        elif not pdf_path.lower().endswith('.pdf'):
            print(f"Warning: Not a PDF file: {pdf_path}", file=sys.stderr)
        else:
            valid_files.append(pdf_path)

    if not valid_files:
        print("Error: No valid PDF files provided", file=sys.stderr)
        sys.exit(1)

    output_path = "mhfa_url_reference.md"
    create_url_reference_document(valid_files, output_path)

    print(f"\n✓ Done! Upload '{output_path}' to your knowledge base S3 bucket.")

if __name__ == "__main__":
    main()
