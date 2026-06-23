async function main() {
  const [password, port] = process.argv.slice(2);
  if (!password) {
    console.error('Usage: node scripts/testLogin.js <password> [port]');
    process.exit(1);
  }

  const url = `http://localhost:${port || 4000}/api/auth/login`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  const text = await res.text();
  console.log('STATUS:', res.status);
  console.log('BODY:', text);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
