# Use the Node.js 18 image as a base image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY ./package*.json ./

# Install app dependencies with verbose log level and ignore optional dependencies
RUN npm i --loglevel verbose --no-optional

RUN npm install --cpu=x64 --os=linux --libc=glibc sharp
# Copy the application code into the container
COPY . .

# Expose the port your app runs on
EXPOSE 2000

# Define the command to run your application
CMD ["node", "Server.js", "0.0.0.0"]

