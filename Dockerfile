# Use the Node.js 18 image as a base image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY ./package*.json ./

# Install PM2 globally
RUN npm install -g pm2

# Install app dependencies with verbose log level and ignore optional dependencies
RUN npm install --loglevel verbose --no-optional

RUN npm install --platform=linux --arch=arm64 sharp

# Copy the application code into the container
COPY . .

# Expose the port your app runs on
EXPOSE 2000

# Define the command to run your application with PM2 and set the port
CMD ["pm2-runtime", "start", "Server.js", "--name", "app", "--", "0.0.0.0", "2000"]
