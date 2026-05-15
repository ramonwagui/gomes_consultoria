process.env.BACKUP_MODE = "monthly";
if (!process.argv[2]) {
  process.argv[2] = "monthly";
}

void import("./backup-run");
