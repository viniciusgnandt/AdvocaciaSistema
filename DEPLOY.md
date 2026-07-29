# Deploy — Trilva

Stack única com dois containers (`trilva_backend`, `trilva_frontend`), sem portas publicadas no host
(`expose` apenas) — o roteamento por domínio e o HTTPS ficam por conta do seu Nginx Proxy Manager
(ou proxy equivalente) já rodando no servidor, mesmo padrão usado no projeto `pertodemim`.

**As imagens são buildadas pelo GitHub Actions** (`.github/workflows/docker-build.yml`), não na
máquina do servidor — o servidor só dá `pull` na imagem já pronta. Isso existe porque buildar
localmente (`next build` + `nest build` dentro do Docker) é pesado demais pra uma máquina fraca.

## 0. Como o build funciona

A cada push em `main` que toque em `backend/**` ou `frontend-app/**` (ou disparo manual pela aba
Actions do GitHub), o workflow builda as duas imagens e publica em `ghcr.io/<seu-usuario>/trilva-backend`
e `trilva-frontend`. Acompanhe em `github.com/<seu-usuario>/AdvocaciaSistema/actions`.

**Na primeira vez**, os pacotes ficam privados no GHCR por padrão. Pra o servidor conseguir dar
`pull` sem precisar de login, torne-os públicos: no repositório no GitHub → aba **Packages** (ou
`github.com/<seu-usuario>?tab=packages`) → abra `trilva-backend` e `trilva-frontend` → **Package
settings** → **Change visibility** → **Public**. Se preferir manter privado, rode
`docker login ghcr.io -u <usuario> -p <personal-access-token com escopo read:packages>` no servidor
antes do primeiro `pull`.

## 1. Pré-requisitos no servidor

- Docker + Docker Compose v2 (`docker compose version`)
- Nginx Proxy Manager (ou nginx manual) já rodando, com acesso à internet nas portas 80/443

## 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencha o `.env` com os valores reais (`MONGO_URI`, `JWT_SECRET`, chaves OCI/DataJud, `GHCR_OWNER`
etc.). Os domínios abaixo são os de teste informados — troque quando forem os definitivos:

```
NEXT_PUBLIC_API_URL=https://apitrilva.viniciusgnandt.com.br
```

> `NEXT_PUBLIC_API_URL` é *inlined* no bundle do Next.js durante o build do GitHub Actions (não é
> lido em runtime). Se o domínio da API mudar, atualize a variável de repositório
> `NEXT_PUBLIC_API_URL` em Settings → Secrets and variables → Actions → Variables no GitHub (ou o
> valor default no workflow) e dispare o build de novo — só trocar no `.env` do servidor não altera
> nada, já que o bundle já foi gerado com o valor antigo.

## 3. Subir a stack

```bash
docker compose pull
docker compose up -d
```

(ou `npm run docker:deploy`, que faz os dois passos). Isso baixa as imagens já buildadas pelo CI e
sobe os dois containers na rede interna `trilva_net`, sem expor nada no host — nada é compilado no
servidor.

> Precisa testar uma mudança local sem esperar o CI? `docker compose up -d --build` (ou
> `npm run docker:up`) builda localmente como antes, ignorando as imagens do registry.

## 4. Conectar o Nginx Proxy Manager à rede da stack

Como os containers só usam `expose` (não `ports`), o NPM precisa enxergá-los pelo nome via Docker DNS.
Se o NPM roda em outra stack/rede, conecte-o manualmente uma vez:

```bash
docker network connect trilva_net <nome-do-container-do-npm>
```

(ou adicione `trilva_net` como rede `external: true` no compose do próprio NPM, o que sobrevive a
restarts sem precisar rodar o comando de novo).

## 5. Criar os Proxy Hosts no NPM

| Domínio | Forward Hostname/IP | Forward Port |
|---|---|---|
| `trilva.viniciusgnandt.com.br` | `trilva_frontend` | `3000` |
| `apitrilva.viniciusgnandt.com.br` | `trilva_backend` | `3001` |

Ative "Force SSL" + solicite certificado Let's Encrypt em cada um.

## 6. Scripts de manutenção (backfills)

Os scripts em `backend/src/scripts/*.script.ts` (`npm run backfill:*`, `criar:usuario-tenant-existente`
etc.) não rodam dentro do container em produção — são para rodar manualmente, uma vez, quando
necessário. Para rodar contra o banco de produção a partir do container já em pé:

```bash
docker compose exec backend sh
# dentro do container:
# (os scripts usam ts-node, que não está na imagem de produção - rode localmente
#  apontando MONGO_URI para o banco de produção, ou adicione ts-node à imagem se preferir
#  rodar de dentro do container)
```

Mais simples: rode o script localmente na sua máquina com o `MONGO_URI` de produção no `.env`
do `backend/` — o script conecta direto no Atlas, não precisa estar dentro do container.

## Comandos úteis

```bash
npm run docker:deploy # pull da imagem do GHCR + up -d (uso normal em produção)
npm run docker:up     # build local + up -d (só quando precisar testar sem o CI)
npm run docker:down   # para tudo
npm run docker:logs   # segue os logs dos dois containers
```
