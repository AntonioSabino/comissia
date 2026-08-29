import { config } from "dotenv";
import { createInitialAdmin } from "../src/modules/auth/application/create-initial-admin";

config({ path: ".env.local", quiet: true });

function getRequiredArgument(flag: string): string {
  const index = process.argv.indexOf(flag);
  const value = process.argv[index + 1];

  if (index === -1 || !value || value.startsWith("--")) {
    throw new Error(`Informe ${flag} na linha de comando`);
  }

  return value;
}

function readHiddenInput(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("A senha deve ser informada em um terminal interativo");
  }

  return new Promise((resolve, reject) => {
    let value = "";
    const input = process.stdin;

    const cleanup = () => {
      input.setRawMode(false);
      input.pause();
      input.removeListener("data", onData);
    };

    const finish = () => {
      cleanup();
      process.stdout.write("\n");
      resolve(value);
    };

    const cancel = () => {
      cleanup();
      process.stdout.write("\n");
      reject(new Error("Operação cancelada"));
    };

    const onData = (data: Buffer) => {
      for (const character of data.toString("utf8")) {
        if (character === "\u0003") {
          cancel();
          return;
        }

        if (character === "\r" || character === "\n") {
          finish();
          return;
        }

        if (character === "\u007f" || character === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
          }
          continue;
        }

        value += character;
      }
    };

    process.stdout.write(prompt);
    input.setRawMode(true);
    input.resume();
    input.on("data", onData);
  });
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não foi definida em .env.local");
  }

  const name = getRequiredArgument("--name");
  const email = getRequiredArgument("--email");
  const password = await readHiddenInput("Senha: ");
  const passwordConfirmation = await readHiddenInput("Confirme a senha: ");

  if (password !== passwordConfirmation) {
    throw new Error("As senhas informadas não coincidem");
  }

  const [{ PostgresInitialAdminRepository }, { postgresPool }] =
    await Promise.all([
      import("../src/modules/auth/infrastructure/db/initial-admin-repository"),
      import("../src/db/index"),
    ]);

  try {
    const admin = await createInitialAdmin(
      { name, email, password },
      { repository: new PostgresInitialAdminRepository() },
    );

    console.log(`Administrador criado: ${admin.name} <${admin.email}>`);
  } finally {
    await postgresPool.end();
  }
}

run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  console.error(`Falha ao criar o administrador inicial: ${message}`);
  process.exitCode = 1;
});
