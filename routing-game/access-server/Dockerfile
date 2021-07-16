FROM node:14
WORKDIR /server

COPY package.json ./
COPY package-lock.json ./

RUN npm install

COPY . .


CMD ["npx", "nodemon"]