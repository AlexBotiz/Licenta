# Platforma Educationala de Cursuri cu Asistent AI Local

## Descrierea Proiectului
Aceasta aplicatie reprezinta o platforma educationala bazata pe web, adaptata pentru invatarea programarii, ce integreaza un asistent local de inteligenta artificiala . Sistemul implementeaza o arhitectura hibrida bazata pe mecanismul RAG (Retrieval-Augmented Generation), care interogheaza automat baza de date relationala pentru a introduce elementele specifice cursului si continutul lectiilor direct in fereastra de context a modelului de limbaj (LLM) . 

Spre deosebire de solutiile comerciale cloud, utilizarea unei instante locale Ollama elimina costurile financiare aferente API-urilor terte, reduce latentele si asigura confidentialitatea totala a datelor si a interactiunilor in cadrul procesului didactic .

## Tehnologii si Instrumente Utilizate
* **Frontend:** Next.js 15, Tailwind CSS v4, React .
* **Backend:** Next.js .
* **Baza de date:** Supabase (PostgreSQL cu suport relational) .
* **Layer Inteligenta Artificiala:** Ollama (Rularea locala a modelului Llama 3) .

## Cerinte Premise (Prerequisites)
Inainte de a incepe configurarea si rularea proiectului, asigurati-va ca aveti instalate urmatoarele componente pe masina gazda:
1. **Node.js** (Versiunea v18 sau mai noua) si managerul de pachete `npm`.
2. **Git** (Pentru clonarea depozitului la nivel local).
3. **Ollama CLI** (Disponibil pentru Windows, macOS sau Linux).

## Ghid de Instalare si Setup

### 1. Clonarea Proiectului
Deschideti un terminal si rulati urmatoarea comanda pentru a descarca proiectul de pe GitLabs:

```bash
git clone [https://gitlab.dev.info.uvt.ro/didactic/2026/licenta/ir/licentaalexandrubotiz2026.git](https://gitlab.dev.info.uvt.ro/didactic/2026/licenta/ir/licentaalexandrubotiz2026.git)
cd nume-proiect
```

### 2. Configurarea Variabilelor de Mediu
In directorul radacina al aplicatiei, creati un fisier numit `.env` sau `.env.local` pentru a stoca cheile de conectare catre instanta dumneavoastra de Supabase.

Exemplu de configurare:

```env
NEXT_PUBLIC_SUPABASE_URL=adresa_dumneavoastra_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=cheia_dumneavoastra_anon_key
SUPABASE_SERVICE_ROLE_KEY=cheia_dumneavoastra_service_role
RAPIDAPI_KEY=cheia_dumneavoastra_rapidapi
```

### 3. Instalarea Dependentelor
Este necesara instalarea pachetelor pentru modulul de client.

**Pentru Client (Next.js):**

```bash
cd client
npm install
```

---

## Ghid de Pornire al Aplicatiei

Pentru functionarea corecta a intregului ecosistem educational, serviciile trebuie pornite in urmatoarea ordine cronologica:

### Pasul 1: Pornirea Motorului LLM Local
Asigurati-va ca serviciul Ollama este activ si rulati modelul Llama 3 utilizand terminalul :

```bash
ollama run llama3
```

### Pasul 2: Pornirea Interfetei Grafice (Client)
Deschideti un al treilea terminal, navigati in folderul `client` si porniti serverul de dezvoltare Next.js :

```bash
cd client
npm run dev
```
*Interfata web va fi accesibila in browser la adresa standard: http://localhost:3000*

## Structura Arhitecturala
* `/client` - Contine paginile, rutele API interne (`/api/chat`), interfata grafica dezvoltata in Next.js si componentele Tailwind CSS .
