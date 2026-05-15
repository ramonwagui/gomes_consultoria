process.env.BACKUP_MODE = "daily";
if (!process.argv[2]) {
  process.argv[2] = "daily";
}

void import("./backup-run");
