const express = require('express');
const jwt = require('jsonwebtoken');
const authMiddelware = require('./middleware');

let USERS_ID = 10;
let ORGANIZATION_ID = 10;
let BOARDS_ID = 10;
let ISSUES_ID = 10;

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
  boardId: 1,
  state: "IN_PROGRESS" // "UP_NEXT" | "IN_PROGRESS" | "DONE" | "ARCHIVED"
}, {
  id: 2,
  title: "add new feat",
  boardId: 1,
  state: "DONE"
}];

const app = express();
const PORT = 3000;
app.use(express.json());

//CREATE

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
    message: "org created",
    organizationId: ORGANIZATION_ID - 1
  });
});

app.post('/add-member-to-organization', authMiddelware, (req, res) => {
  const userId = req.userId;
  const organizationId = req.body.organizationId;
  const memberUsername = req.body.memberUsername;

  const organization = ORGANIZATON.find(org => org.id === organizationId);

  if( !organization || organization.admin !== userId){
    res.status(411).json({
      message: "either this org doesnt exists or you are not an admin of this org"
    });
    return;
  }

  const member = USERS.find(u => u.username === memberUsername);

  if(!member){
    res.sendStatus(411).json({
      message: "no user with this username exists in our database"
    });
    return;
  }

  organization.members.push(member.id);
  res.json({
    message: "new member added"
  });
});

app.post('/board', authMiddelware, (req, res)=> {
  const userId = req.userId;
  const organizationId = req.body.organizationId;

  const organization = ORGANIZATON.find(org => org.id === organizationId);

  if(!organization){
    return res.status(404).json({
      message: "this org doesnt exists"
    });
  }
  if(organization.admin !== userId){
    return res.status(403).json({
      message: "only admin can create boards"
    });
  }

  BOARDS.push({
    id: BOARDS_ID++,
    title: req.body.title,
    organizationId: organizationId
  });
  res.json({
    message: "board created",
    boardId: BOARDS_ID - 1
  });
});

app.post('/issue', authMiddelware, (req, res) => {

});


//GET endpoints
//READ

app.get('/organization', authMiddelware, (req, res) => {
  const userId = req.userId;
  const organizationId = parseInt(req.query.organizationId);

  const organization = ORGANIZATON.find(org => org.id === organizationId);
  if(!organization){
    return res.status(404).json({
      message: "org doesnt exist"
    });
  }
  if(organization.admin !== userId){
    return res.status(403).json({
      message: "you are not the admin of this org"
    });
  }

  res.json({
    organization: {
      ...organization,
      members: organization.members.map(memberId => {
        const user = USERS.find(u => u.id === memberId);
        return{
          id: user.id,
          username: user.username
        }
      })
    }
  });
});

app.get('/board', authMiddelware, (req, res) => {

});

app.get('/issues', authMiddelware, (req, res) => {

});

app.get('/members', authMiddelware, (req, res) => {

});

//UPDATE

app.put('/issues', authMiddelware, (req, res) => {

})

//DELETE
app.delete('/members', authMiddelware, (req, res) => {
  const userId = req.userId;
  const organizationId = req.body.organizationId;
  const memberUsername = req.body.memberUsername;

  const organization = ORGANIZATON.find(org => org.id === organizationId);

  if(!organization){
    return res.status(404).json({
      message: "this org doesnt exists"
    });
  }
  if(organization.admin !== userId){
    return res.status(403).json({
      message: "only admin can remove members"
    });
  }

  const member = USERS.find(u => u.username === memberUsername);

  if(!member){
    return res.status(404).json({
      message: "user not found"
    });
  }
  if(!organization.members.includes(member.id)){
    return res.status(404).json({
      message: "user is not a member of this org"
    });
  }

  organization.members = organization.members.filter(id => id !== member.id);
  return res.json({
    message: "member deleted"
  });
})

app.get('/', authMiddelware, (req, res) => {
  res.json('hi');
});

app.listen(PORT, () => {
  console.log("http://localhost:3000");
})