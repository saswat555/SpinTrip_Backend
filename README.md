# SpinTrip_Backend

Welcome to the backend repository for spintrip, a car rental platform aimed at providing efficient and user-friendly services to rent cars.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- **Node.js (v18)**
  
  Ensure you have Node.js version 18 installed on your system. You can download it from [Node.js website](https://nodejs.org/).

- **PostgreSQL**

  Make sure PostgreSQL is installed and running on your system. If you need to install it, you can find it on the [PostgreSQL official site](https://www.postgresql.org/).

- **Docker**

  Make sure Docker is installed on all machines that will be part of the swarm.. If you need to install it, you can find it on the [Docker official site](https://docs.docker.com/).


### Installation

1. **Clone the repository:**

    ```bash
    git clone https://github.com/<Your-Github-Username>/SpinTrip_Backend.git
    cd SpinTrip_Backend
    ```

2. **Install dependencies:**

    ```bash
    npm install
    ```

3. **Database Setup:**

   - Start your PostgreSQL server and ensure it's running.
   - Create a PostgreSQL user named `postgres` with password `1234`.

     ```sql
     CREATE USER postgres WITH PASSWORD '1234';
     ```

   - Grant necessary permissions and create your database. Make sure to name it appropriately according to your project's requirements.

4. **Configure your project:**

   - Navigate to `models/index.js` in your project directory.
   - Configure the database connection settings with the PostgreSQL user you've just created.

     ```javascript
     // Example configuration in models/index.js
     const sequelize = new Sequelize('database', 'postgres', '1234', {
       host: 'localhost',
       dialect: 'postgres',
       // other configs
     });
 
5.  **Implementing Docker swarm**    
   - do `docker swarm init --advertise-addr <MANAGER-IP>` to make it manager 
   - to connect to a swarm as a worker node `docker swarm join --token <token> <manager-ip>:<manager-port>`
   -and to deploy server `docker stack deploy -c docker-compose.yml spintrip`

### Running the application

1. **Start the server:**

    ```bash
    npm start
    ```

   The server should now be running and accessible at `http://localhost:3000` (or whichever port you've configured).

## Running Tests

Explain how to run the automated tests for this system (if applicable).

```bash
npm test

