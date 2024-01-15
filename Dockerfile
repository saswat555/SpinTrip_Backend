# Use the Node.js 18 image as a base image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
RUN git clone https://github.com/saswat555/SpinTrip_Backend/blob/main/package.json

# Install app dependencies with verbose log level and ignore optional dependencies
RUN npm i --loglevel verbose --no-optional

# Copy the application code into the container
# We use a .dockerignore file to exclude node_modules
RUN git clone https://github.com/saswat555/SpinTrip_Backend.git

# Expose the port your app runs on
EXPOSE 2000

# Define the command to run your application
CMD ["node", "Server.js"]
