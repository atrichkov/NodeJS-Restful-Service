# Node JS RESTful API

## API

### API Usage

Resource | Method | Description | Example |
--- | --- | --- | ---
`/api/register` | POST | register new user | Request Body: username={username}&password={password}
`/api/authenticate` | POST | verify login attempt with user and password | Request Body: username={username}&password={password}
`/api/logout` | GET | blacklist JWT token | Request header token={token}
`/api/feed/{page}/{limit}`| GET | return cat profiles json object with page and optional limit | /api/feed/{page}/{limit}
`/api/add` | POST | add new cat profile | Request Body: image{file expected}&name={name}&specie={specie}&color={color}
