const express = require('express');
const jwt = require('jsonwebtoken');
const authMiddelware = require('./middleware');

let USERS_ID = 1;
let ORGANIZATION_ID = 1;
let BOARDS_ID = 1;
let ISSUES_ID = 1;

const USERS = [{
  id: 1,
  username: "anuj123",
  password: "123123"
}, {
  id: 2,
  username: "rahul",
  password: "1231234"
}];

const ORGANIZATON = [{
  id: 1,
  title: "zomato",
  description: "order food",
  admin: 1,
  members: [2]
}, {
  id: 2,
  title: "org 2",
  description: "org 2 description",
  admin: 2,
  members: []
}];

const BOARDS = [{
  id: 1,
  title: "zomato website frontend",
  organizationId: 1
}];

const ISSUES = [{
  id: 1,
  title: "add dark mode",
  boardId: 1
}, {
  id: 2,
  title: "add new feat",
  boardId: 1
}];

const app = express();
const PORT = 3000;
app.use(express.json());


app.post('/signup', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const userExists = USERS.find((user) => {
    return user.username === username;
  });

  if(userExists){
    res.status(400).json({
      message: "User already exists"
    });
    return;
  }

  USERS.push({
    id: USERS_ID++,
    username: username,
    password: password
  });
  res.json({
    message: "Signup successful"
  });
});

app.post('/signin', (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const newUser = USERS.find((user) => {
    return (user.username === username &&
            user.password === password);
  });

  if(!newUser){
    res.status(401).json({
      message: "Invalid credentials"
    });
    return;
  }

  const token = jwt.sign({
    userId: newUser.id
  }, "secret1234");
  res.json(token);
});

app.post('/organization', authMiddelware, (req, res) => {
  const userId = req.userId;
  ORGANIZATON.push({
    id: ORGANIZATION_ID++,
    title: req.body.title,
    description: req.body.description,
    admin: userId,
    members: []
  });
  res.json({
    message: "org created"
  });
});

app.get('/', authMiddelware, (req, res) => {
  res.json('hi');
});

app.listen(PORT, () => {
  console.log("http://localhost:3000");
})