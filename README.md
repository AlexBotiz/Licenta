--- PASI DE PORNIRE ---
1. Pornim baza de date supabase:
- din browser intram pe subase sa fie deschis

2. Pornim serverul cu comenzile:
- cd Server 
- npm run dev

3. Pornim clientul in alt terminal cu comenzile:
- cd client
- npm run dev

--- IN CAZ DE PROBLEMA LA DESCHIDERE ---
1. Daca avem un fisier package-lock.json inafara folderelor client/Server il stergem
2. Apoi in terminalul client rulam comanda rm -r -fo .next ca sa curatam cache-ul
3. Apoi rulam npm install curat si dupa rulam cu npm run dev


--- IN CAZ DE ERROR 404 ---
1. rm -r -fo .next
2. npx next dev in folderul client in loc de cel obisnuit 