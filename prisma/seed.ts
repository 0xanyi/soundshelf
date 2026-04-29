async function main() {
  console.info(
    "Seed skipped: admin user creation will be added once Better Auth is wired."
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
