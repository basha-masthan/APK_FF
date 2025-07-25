FROM node:alpine3.18
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 80
CMD [ "npm", "run", "start" ]