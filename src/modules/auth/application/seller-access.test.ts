import { describe, expect, it, vi } from "vitest";
import {
  changeSellerAccess,
  createSellerAccess,
  SellerAccessAlreadyExistsError,
  SellerAccessEmailInUseError,
  SellerAccessNotFoundError,
  SellerAccessValidationError,
} from "./seller-access";
import type {
  SellerAccessCreationResult,
  SellerAccessRepository,
} from "./seller-access-repository";

const SELLER_ID = "7b5b0f3c-5f3f-4a1a-9a4f-2b1f0a5a1c11";

const ACCESS = {
  userId: "0a2f1d4e-1c3b-4d5a-9e6f-7a8b9c0d1e2f",
  sellerId: SELLER_ID,
  email: "helena@exemplo.test",
  active: true,
};

const INPUT = {
  sellerId: SELLER_ID,
  name: "Helena Duarte",
  email: "Helena@Exemplo.test",
};

function createDependencies(
  result: SellerAccessCreationResult = { status: "created", access: ACCESS },
) {
  const repository: SellerAccessRepository = {
    findBySellerId: vi.fn().mockResolvedValue(null),
    createSellerAccess: vi.fn().mockResolvedValue(result),
    setSellerAccessActive: vi.fn().mockResolvedValue(ACCESS),
  };

  return {
    repository,
    hashPassword: vi.fn().mockResolvedValue("hash-guardado"),
    generateTemporaryPassword: vi.fn().mockReturnValue("senha-sorteada"),
  };
}

describe("createSellerAccess", () => {
  it("cria o acesso com o e-mail do cadastro e devolve a senha sorteada", async () => {
    const dependencies = createDependencies();

    const created = await createSellerAccess(INPUT, dependencies);

    expect(created).toEqual({
      access: ACCESS,
      temporaryPassword: "senha-sorteada",
    });
    expect(dependencies.repository.createSellerAccess).toHaveBeenCalledWith({
      sellerId: SELLER_ID,
      name: "Helena Duarte",
      email: "helena@exemplo.test",
      passwordHash: "hash-guardado",
    });
  });

  it("guarda apenas o hash, nunca a senha", async () => {
    const dependencies = createDependencies();

    await createSellerAccess(INPUT, dependencies);

    expect(dependencies.hashPassword).toHaveBeenCalledWith("senha-sorteada");
    const [stored] = vi.mocked(dependencies.repository.createSellerAccess).mock
      .calls[0];
    expect(JSON.stringify(stored)).not.toContain("senha-sorteada");
  });

  it("recusa vendedor que não é um identificador válido", async () => {
    await expect(
      createSellerAccess(
        { ...INPUT, sellerId: "vendedor-1" },
        createDependencies(),
      ),
    ).rejects.toBeInstanceOf(SellerAccessValidationError);
  });

  it("recusa cadastro sem e-mail utilizável", async () => {
    await expect(
      createSellerAccess({ ...INPUT, email: "helena" }, createDependencies()),
    ).rejects.toThrow("O vendedor precisa de um e-mail válido no cadastro");
  });

  it("recusa cadastro sem nome", async () => {
    await expect(
      createSellerAccess({ ...INPUT, name: "   " }, createDependencies()),
    ).rejects.toBeInstanceOf(SellerAccessValidationError);
  });

  it("recusa criar um segundo acesso para o mesmo vendedor", async () => {
    await expect(
      createSellerAccess(
        INPUT,
        createDependencies({ status: "access-already-exists" }),
      ),
    ).rejects.toBeInstanceOf(SellerAccessAlreadyExistsError);
  });

  it("recusa e-mail já usado por outro usuário", async () => {
    await expect(
      createSellerAccess(INPUT, createDependencies({ status: "email-in-use" })),
    ).rejects.toBeInstanceOf(SellerAccessEmailInUseError);
  });

  it("recusa vendedor inexistente", async () => {
    await expect(
      createSellerAccess(
        INPUT,
        createDependencies({ status: "seller-not-found" }),
      ),
    ).rejects.toBeInstanceOf(SellerAccessValidationError);
  });
});

describe("changeSellerAccess", () => {
  it("bloqueia o acesso do vendedor", async () => {
    const dependencies = createDependencies();

    await changeSellerAccess(
      { sellerId: SELLER_ID, active: false },
      dependencies,
    );

    expect(dependencies.repository.setSellerAccessActive).toHaveBeenCalledWith(
      SELLER_ID,
      false,
    );
  });

  it("libera o acesso do vendedor", async () => {
    const dependencies = createDependencies();

    await changeSellerAccess(
      { sellerId: SELLER_ID, active: true },
      dependencies,
    );

    expect(dependencies.repository.setSellerAccessActive).toHaveBeenCalledWith(
      SELLER_ID,
      true,
    );
  });

  it("recusa situação que não é booleana", async () => {
    await expect(
      changeSellerAccess(
        { sellerId: SELLER_ID, active: "sim" },
        createDependencies(),
      ),
    ).rejects.toBeInstanceOf(SellerAccessValidationError);
  });

  it("recusa alterar acesso que não existe", async () => {
    const dependencies = createDependencies();
    vi.mocked(dependencies.repository.setSellerAccessActive).mockResolvedValue(
      null,
    );

    await expect(
      changeSellerAccess({ sellerId: SELLER_ID, active: false }, dependencies),
    ).rejects.toBeInstanceOf(SellerAccessNotFoundError);
  });
});
