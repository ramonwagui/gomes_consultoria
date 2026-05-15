process.env.BACKUP_MODE = "hourly";
if (!process.argv[2]) {
  process.argv[2] = "hourly";
}

void import("./backup-run");
