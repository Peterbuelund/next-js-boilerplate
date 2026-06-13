const VALID_ENVS = ["dev", "prod"] as const;
type AppEnv = (typeof VALID_ENVS)[number];

const raw = process.env.ENV;

if (raw !== undefined && !VALID_ENVS.includes(raw as AppEnv)) {
    throw new Error(
        `Invalid ENV value: "${raw}". Must be one of: ${VALID_ENVS.join(", ")}`
    );
}

export const env = {
    APP_ENV: (raw ?? "prod") as AppEnv,
    isDev: raw === "dev",
    isProd: raw === "prod" || raw === undefined,
};
