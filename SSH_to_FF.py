# Code from <https://stackoverflow.com/a/6682934/1535629>
import base64, hashlib

# paste your key on line 6
key = """
KEydAtaPubl?PrivkeYfILe= username
"""

def lineToFingerprint(line):
    key = base64.b64decode(line.strip().split()[1].encode('ascii'))
    fp_plain = hashlib.md5(key).hexdigest()
    return ':'.join(a+b for a,b in zip(fp_plain[::2], fp_plain[1::2]))

print(lineToFingerprint(key))

# Public Key
# python3 SSH_to_FF.py 
# 9g:4f:39:1c:1f:6e:30:6b:gg:44:05:3b:c2:g6:d4:18
