# MealSync

Aplicativo mobile de planejamento alimentar, gestão de receitas e lista de compras inteligente, desenvolvido como projeto acadêmico em **React Native + Expo SDK 54**.

---

## Stack

### Frontend
| Tecnologia | Uso |
|---|---|
| React Native + Expo SDK 54 | Base do app mobile |
| TypeScript | Tipagem estática |
| Redux Toolkit + redux-persist | Estado global + persistência offline |
| React Navigation v7 | Navegação entre telas |
| expo-notifications | Timer com vibração + lembretes de refeições |
| expo-local-authentication | Login com biometria (Face ID / digital) |
| expo-camera | Scanner de código de barras |
| expo-location | GPS para mapa de supermercados e clima |
| react-native-maps | Mapa com marcadores de supermercados |
| expo-sensors (LightSensor) | Modo escuro automático por sensor de luz |
| expo-print + expo-sharing | Exportação da lista de compras em PDF |
| expo-speech | Leitura de passos da receita em voz |

### Backend
| Tecnologia | Uso |
|---|---|
| Node.js + Express | API REST |
| TypeScript | Tipagem estática |
| PostgreSQL | Usuários, histórico, avaliações, tokens |
| MongoDB (Mongoose) | Receitas |
| JWT (access + refresh token) | Autenticação |
| Cloudinary | Upload e armazenamento de imagens |
| Nodemailer + Gmail | E-mail de recuperação de senha |
| Docker Compose | Bancos de dados em desenvolvimento |

### Integrações externas (via proxy no backend)
| API | RF |
|---|---|
| Open Food Facts | RF11 — scanner de código de barras |
| Overpass / OpenStreetMap | RF19 — mapa de supermercados |
| OpenWeatherMap | RF28 — sugestão de receitas por clima |
| Tabela interna de conversão | RF18 — conversor de unidades culinárias |

---

## Funcionalidades implementadas

### Requisitos Funcionais

| RF | Descrição | Status |
|:---:|---|:---:|
| RF1 | Cadastro de usuário com preferências alimentares (vegetariano, sem glúten, sem lactose) | ✅ |
| RF2 | Login com biometria (impressão digital / Face ID) | ✅ |
| RF3 | Dashboard com resumo semanal, acesso rápido e card de clima | ✅ |
| RF4 | Cadastro de receitas com ingredientes, passos, tempo, porções, categoria e foto | ✅ |
| RF5 | Listagem de receitas com busca por texto e filtros por categoria | ✅ |
| RF6 | Visualização detalhada com ingredientes, passos, timer e ações | ✅ |
| RF7 | Favoritar receitas com sincronização no servidor | ✅ |
| RF8 | Planejamento semanal de refeições (café / almoço / jantar por dia) | ✅ |
| RF9 | Geração automática de lista de compras a partir do planejamento | ✅ |
| RF10 | Edição manual da lista: adicionar, remover, marcar, compartilhar, categorias customizadas | ✅ |
| RF11 | Scanner de código de barras via Open Food Facts | ✅ |
| RF13 | Timer integrado com alerta vibratório por etapa da receita | ✅ |
| RF14 | Compartilhamento de receitas via deep link (`mealsync://recipe/:id`) | ✅ |
| RF15 | Cache offline via AsyncStorage + redux-persist | ✅ |
| RF16 | Sugestão de receitas por ingredientes disponíveis | ✅ |
| RF17 | Ajuste automático de porções com recálculo de ingredientes | ✅ |
| RF18 | Conversão de unidades culinárias (xícara, colher, ml, g, etc.) | ✅ |
| RF19 | Mapa de supermercados próximos com marcadores e endereços | ✅ |
| RF20 | Histórico de receitas preparadas | ✅ |
| RF21 | Avaliação com estrelas (1–5) e comentários | ✅ |
| RF23 | Modo escuro automático via sensor de luz (fallback: tema do SO) | ✅ |
| RF24 | Exportação da lista de compras em PDF compartilhável | ✅ |
| RF25 | Múltiplas listas de compras | ✅ |
| RF26 | Duplicar e adaptar receitas existentes | ✅ |
| RF27 | Lembretes push 30 min antes das refeições planejadas | ✅ |
| RF28 | Sugestão de receitas baseada no clima atual (OpenWeatherMap) | ✅ |
| RF29 | Recuperação de senha via e-mail (link + token) | ✅ |
| RF30 | Onboarding interativo na primeira abertura | ✅ |

### Requisitos Não-Funcionais

| RNF | Descrição | Status |
|:---:|---|:---:|
| RNF1 | React Native + TypeScript + Redux Toolkit | ✅ |
| RNF2 | API REST Node/Express + MongoDB + PostgreSQL + JWT | ✅ |
| RNF3 | Cache offline (AsyncStorage + redux-persist para receitas e listas) | ✅ |
| RNF4 | Cloudinary para armazenamento de imagens | ✅ |
| RNF5 | APIs externas integradas via proxy no backend | ✅ |
| RNF6 | App funciona offline para receitas e listas de compras | ✅ |
| RNF7 | Notificações push com expo-notifications (timer + lembretes) | ✅ |
| RNF8 | Acessibilidade: `accessibilityLabel` + `accessibilityRole` nos elementos interativos | ✅ |
| RNF9 | Testes unitários com Jest (13 testes — scaleIngredient + generateShoppingList) | ✅ |
| RNF10 | Git semântico + CI/CD GitHub Actions + build APK via EAS | ✅ |

---

## Rodar localmente

### Pré-requisitos
- Node.js 20+
- Docker Desktop
- Expo Go no celular (Android ou iOS)

### 1. Clonar o repositório
```bash
git clone https://github.com/IssamiU/COMPRINHAS.git
cd COMPRINHAS
```

### 2. Configurar o backend

Criar `backend/.env`:
```env
PORT=3000

DB_HOST=localhost
DB_PORT=5433
DB_USER=comprinhas_user
DB_PASSWORD=comprinhas_pass
DB_NAME=comprinhas_db

MONGO_URI=mongodb://localhost:27017/mealsync

JWT_SECRET=segredo_jwt_comprinhas
JWT_REFRESH_SECRET=segredo_refresh_comprinhas
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

GMAIL_USER=<seu gmail>
GMAIL_APP_PASSWORD=<app password do gmail>

CLOUDINARY_NAME=<cloud name>
CLOUDINARY_API_KEY=<api key>
CLOUDINARY_API_SECRET=<api secret>

OPENWEATHER_API_KEY=<chave openweathermap>
FRONTEND_URL=*
```

Subir os bancos e o servidor:
```bash
cd backend
docker-compose up -d
npm install
npm run dev
```

### 3. Configurar o frontend

Descobrir o IP local da máquina:
```bash
# Windows
ipconfig

# Mac / Linux
ifconfig | grep "inet "
```

Criar `frontend/.env`:
```env
EXPO_PUBLIC_API_URL=http://SEU_IP_LOCAL:3000
```

Instalar e iniciar:
```bash
cd frontend
npm install
npx expo start
```

Abrir o **Expo Go** no celular e escanear o QR code. O celular e o PC precisam estar na mesma rede Wi-Fi.

---

## Gerar APK (Android)

```bash
cd frontend
npx eas-cli build --platform android --profile preview
```

O APK fica disponível para download em [expo.dev](https://expo.dev) após o build (~10–15 min).

> O APK embute a `EXPO_PUBLIC_API_URL` no momento do build. Se o IP ou URL do backend mudar, é necessário rebuildar.

---

## Deploy do backend no Railway

O backend está pronto para deploy com Docker. Consulte o [Dockerfile](backend/Dockerfile) e veja o passo a passo na seção de configuração.

Variáveis de ambiente referenciadas no Railway:
```
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_NAME=${{Postgres.PGDATABASE}}
MONGO_URI=<connection string do MongoDB Atlas>
```

---

## Rodar os testes

```bash
cd frontend
npm test
```

13 testes unitários cobrindo `scaleIngredient` e `generateShoppingList`.

---

## Estrutura do projeto

```
COMPRINHAS/
├── frontend/                   React Native + Expo
│   ├── App.tsx
│   ├── app.json
│   ├── eas.json                Perfis de build EAS
│   └── src/
│       ├── components/         AuthBootstrap, StarRating
│       ├── navigation/         AppNavigator (stack + tabs)
│       ├── screens/
│       │   ├── auth/           Login, Register, ForgotPassword, ResetPassword
│       │   ├── dashboard/      DashboardScreen (clima + resumo semanal)
│       │   ├── history/        HistoryScreen
│       │   ├── onboarding/     OnboardingScreen
│       │   ├── planner/        PlannerScreen (lembretes push)
│       │   ├── profile/        Profile, PersonalData, FoodPreferences,
│       │   │                   Notifications, HelpSupport
│       │   ├── recipes/        RecipesList, RecipeDetails, CreateRecipe,
│       │   │                   EditRecipe, SuggestByIngredients,
│       │   │                   CommunityRecipes
│       │   └── shopping/       ShoppingLists, ShoppingList,
│       │                       BarcodeScanner, SupermarketsMap
│       ├── services/           api.ts, imageService.ts, offlineCache.ts
│       ├── storage/            authStorage.ts
│       ├── store/              Redux store + slices
│       ├── theme/              colors.ts, darkColors.ts, ThemeContext.tsx
│       ├── types/              navigation, recipe, shopping, planner, user
│       └── utils/              scaleIngredient, generateShoppingList,
│                               normalizeRecipe, __tests__/
│
├── backend/                    Node.js + Express
│   ├── Dockerfile
│   ├── docker-compose.yml      PostgreSQL 16 (5433) + MongoDB 7 (27017)
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       ├── config/             database (PG), mongo, initDb
│       ├── controllers/        auth, recipe, history, upload,
│       │                       proxy, review
│       ├── middlewares/        authMiddleware
│       ├── models/             Recipe (Mongoose)
│       └── routes/             auth, recipes, history, upload,
│                               proxy, reviews
│
└── .github/
    └── workflows/
        └── ci.yml              GitHub Actions — Jest em cada push/PR
```

---

## CI/CD

GitHub Actions executa os testes Jest automaticamente em cada push para `develop` ou `master` e em pull requests. Veja [.github/workflows/ci.yml](.github/workflows/ci.yml).

---

## Autor

**Issami Umeoka**
