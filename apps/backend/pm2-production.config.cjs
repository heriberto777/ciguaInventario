module.exports = {
    apps: [
        {
            name: "cigua-inv-backend",
            script: "dist/server.js",
            cwd: "/home/heriberto777/proyectos/ciguainv/apps/backend",
            watch: false,
            max_memory_restart: "500M",
            exec_mode: "fork",
            autorestart: true,
            env: {
                NODE_ENV: "production",
                PORT: 3990
            },
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            error_file: "logs/error.log",
            out_file: "logs/out.log",
            merge_logs: true
        }
    ]
};
