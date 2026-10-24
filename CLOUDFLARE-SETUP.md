# Ativar o painel Mavie Closet sem Zero Trust

O painel usa Login do Google e uma sessão assinada pelas Pages Functions. O servidor só aceita `tamilemaria@hotmail.com`; a senha Google nunca é pedida nem guardada pelo site. Não é necessário ativar Cloudflare Zero Trust.

## 1. Criar a credencial Google

1. Acesse o Google Cloud Console e crie ou escolha um projeto.
2. Configure a tela de consentimento OAuth como **External** e inclua `tamilemaria@hotmail.com` como usuário de teste enquanto o app estiver em teste. Uma conta Hotmail pode ser usada se estiver cadastrada como Conta Google.
3. Crie uma credencial **OAuth client ID** do tipo **Web application**.
4. Em **Authorized JavaScript origins**, adicione `https://site-tamile.pages.dev` (sem caminho final).
5. Copie o Client ID. Ele não é segredo; o token de login é validado no servidor.

## 2. Criar um segredo de sessão

Gere uma chave aleatória longa (pelo menos 32 caracteres). Cadastre-a diretamente como **Secret** no Cloudflare; não a coloque neste arquivo nem no GitHub. Se usar o Terminal do Mac, `openssl rand -hex 32` gera um valor adequado. Nunca cole tokens ou segredos na conversa.

## 3. Cadastrar variáveis no Cloudflare Pages

No projeto `site-tamile`, abra **Settings → Variables and Secrets** e adicione as variáveis para **Production**. Se quiser testar em previews, configure-as também no ambiente **Preview**.

| Nome | Tipo | Valor |
|---|---|---|
| `ADMIN_EMAIL` | variável | `tamilemaria@hotmail.com` |
| `GOOGLE_CLIENT_ID` | variável | Client ID criado na etapa 1 |
| `ADMIN_SESSION_SECRET` | Secret | chave aleatória criada na etapa 2 |
| `GITHUB_OWNER` | variável | `p13295672-sys` |
| `GITHUB_REPO` | variável | `site-tamile` |
| `GITHUB_BRANCH` | variável | `main` |
| `GITHUB_TOKEN` | Secret | token fine-grained com acesso somente ao repositório `site-tamile` e permissão **Contents: Read and write** |

Salve as configurações e inicie um novo deploy (ou faça um novo commit) para as Functions receberem as variáveis.

## 4. Testar

Abra `https://site-tamile.pages.dev/admin.html`. Antes do login, o painel e suas funções de leitura e escrita permanecem bloqueados. Entre com a conta Google autorizada. A sessão expira após uma hora e usa cookie `Secure`, `HttpOnly` e `SameSite=Strict`.

Se o token GitHub anteriormente compartilhado na conversa ainda estiver ativo, revogue-o nas configurações do GitHub e gere outro. Cadastre o novo diretamente no Cloudflare como Secret.

## Observações

- Cloudflare Zero Trust não faz parte deste método e não é necessário configurar cobrança para ativá-lo.
- As Pages Functions são executadas no plano gratuito dentro dos limites vigentes do Cloudflare. O login verifica a assinatura do token Google no servidor e exige e-mail verificado, emissor, audiência e nonce válidos.
- O painel pode ser visto por qualquer pessoa como tela de login, mas somente a conta configurada consegue abrir os recursos administrativos.
- O login é para uma única conta permitida por `ADMIN_EMAIL`.
