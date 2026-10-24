# Configurar proteção do painel Mavie Closet

O painel só fica protegido quando o projeto estiver publicado no Cloudflare Pages e a aplicação Cloudflare Access estiver configurada. A verificação no servidor fecha o acesso se faltar configuração, se o token não for válido ou se o e-mail não for o autorizado.

## Publicação

1. Crie um projeto Cloudflare Pages conectado ao repositório GitHub `p13295672-sys/site-tamile`.
2. Defina a pasta de saída como `.` e deixe o comando de build vazio.
3. Em **Settings → Variables and Secrets**, configure:
   - `CF_ACCESS_TEAM_DOMAIN`: domínio da equipe Cloudflare Access, como `https://equipe.cloudflareaccess.com`.
   - `CF_ACCESS_AUD`: Audience (AUD) da aplicação Access.
   - `ADMIN_EMAIL`: `tamilemaria@hotmail.com`.
   - `GITHUB_OWNER`: `p13295672-sys`.
   - `GITHUB_REPO`: `site-tamile`.
   - `GITHUB_BRANCH`: `main`.
   - `GITHUB_TOKEN`: fine-grained token restrito a este repositório, com **Contents: Read and write**. Cadastre como **Secret**, nunca como variável pública.

## Cloudflare Access e Google

1. Adicione o provedor Google ao Cloudflare Access. O endereço autorizado precisa ser uma Conta Google; um endereço Hotmail pode ser usado após cadastro como Conta Google.
2. Crie uma aplicação Access **Self-hosted** para o domínio publicado e proteja `/admin.html` e `/api/admin/*`.
3. Crie uma política Allow com apenas `tamilemaria@hotmail.com`. Não crie política pública ou Bypass para esses caminhos.
4. Anote o Audience (AUD) da aplicação e o domínio da equipe e cadastre-os nas variáveis acima.
5. Proteja também o domínio de produção `*.pages.dev` e os domínios de preview utilizados; eles podem exigir aplicações Access separadas.
6. Ative **Fail closed** para limites de execução das Pages Functions.
7. Confirme que o painel pede login Google e que somente o e-mail autorizado consegue acessar.

O painel não usa mais token GitHub no navegador. O token de publicação fica como Secret das Pages Functions, e as funções verificam a identidade Access e o e-mail permitido.
