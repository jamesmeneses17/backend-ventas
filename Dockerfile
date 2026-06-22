# ----------------------------------------------------------------
# ETAPA 1: BUILDER (USADA PARA INSTALAR Y COMPILAR)
FROM node:22 AS builder
#aver

WORKDIR /app
COPY package.json package-lock.json ./

# **Instala TODAS las dependencias para que el 'build' funcione**
RUN npm install 
COPY . .
RUN npm run build 

# ----------------------------------------------------------------
# ETAPA 2: PRODUCTION (USADA SOLO PARA EJECUTAR)
FROM node:22-alpine 

ENV NODE_ENV=production

WORKDIR /app

# **Copia los archivos de package.json y package-lock.json**
# **Esto es necesario para que el siguiente comando instale las dependencias.**
COPY package.json package-lock.json ./

# **Instala SOLO las dependencias de producción en esta etapa final**
RUN npm install --only=production

# Instalar mysql-client para poder ejecutar mysqldump (necesario para backups)
RUN apk add --no-cache mysql-client

# Copiamos solo el código compilado
COPY --from=builder /app/dist ./dist

EXPOSE 5000 

CMD ["node", "dist/main.js"]