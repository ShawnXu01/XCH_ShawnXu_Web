from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
import jwt
import time

# 1. 生成RSA密钥对
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048
)
public_key = private_key.public_key()

# 2. 导出为PEM格式
private_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)
public_pem = public_key.public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)

# 3. 保存到文件
with open('private.key', 'wb') as f:
    f.write(private_pem)
with open('public.key', 'wb') as f:
    f.write(public_pem)

print('私钥已生成并保存至 private.key')
print('公钥已生成并保存至 public.key')

# 4. 使用私钥生成JWT
payload = {
    'userId': 123,
    'name': 'Alice',
    'exp': int(time.time()) + 3600  # 过期时间：1小时后
}
token = jwt.encode(payload, private_pem, algorithm='RS256')
print('生成的JWT:', token)

# 5. 使用公钥验证JWT
decoded = jwt.decode(token, public_pem, algorithms=['RS256'])
print('验证成功，解码结果:', decoded)