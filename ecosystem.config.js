module.exports = {
  apps: [
    {
      name: "prisma-studio",
      script: "cmd.exe",
      args: "/c npm run studio",
      cwd: "C:\\NCS\\vsCode\\notice-next",
      autorestart: true,
      watch: false,
    },
  ],
};
