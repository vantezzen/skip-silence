FROM node:14

WORKDIR /app
COPY package*.json ./
RUN npm install

RUN apt-get update
RUN apt-get install -y zip

COPY . .
CMD ["bash", ".docker/start.sh"]