# Use te latest official Node.js LTS image as the base image
FROM node:25-alpine3.22

# Set the working directory inside the container to /usr/src/app
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY react-app/package*.json ./

# Install the project dependencies
RUN npm install

# Copy the rest of the application code to the working directory
COPY react-app/ .

# Expose port 3000 to the outside world
EXPOSE 3000

# Start the application using npm
CMD ["npm", "start"]