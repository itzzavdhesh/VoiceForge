import urllib.request
import json
import ssl

ctx = ssl.create_default_context()

issues = []
url = 'https://api.github.com/repos/itzzavdhesh/VoiceForge/issues?state=all&per_page=100'

while url:
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, context=ctx, timeout=10) as res:
        data = json.loads(res.read())
        issues.extend([i for i in data if 'pull_request' not in i])
        
        # Check for pagination Link header
        link_header = res.getheader('Link')
        url = None
        if link_header:
            links = link_header.split(', ')
            for link in links:
                parts = link.split(';')
                if len(parts) == 2 and 'rel="next"' in parts[1]:
                    url = parts[0].strip('<>')
                    break

for i in issues:
    print(f"{i['state'].upper()}: {i['title']}")
