const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport"),
  LocalStrategy = require("passport-local").Strategy;
const passportLocalMongoose = require("passport-local-mongoose");

const homeStartingContent =
  "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent =
  "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent =
  "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

// let posts = [];

const app = express();

app.set("view engine", "ejs");

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(express.static("public"));

// config the sesions
app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: true,
  })
);

// initialize passport
app.use(passport.initialize());
// use passport to manage  sessions
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/blogDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("useCreateIndex", true);

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  date: {
    type: Date,
    default: Date.now,
  },
  comments: [
    {
      user: String,
      email: String,
      content: String,
      date: Date,
    },
  ],
});

const Post = mongoose.model("Post", postSchema);

const userSchema = new mongoose.Schema({
  email: String,
  username: String,
  password: String,
  role: String,
});

userSchema.plugin(passportLocalMongoose, { usernameField: "email" });

const User = new mongoose.model("User", userSchema);

// passport.use(User.createStrategy());

// passport.use(
//   new LocalStrategy(
//     {
//       usernameField: "email",
//     },
//     function (username, password, done) {
//       console.log("Username: " + username);

//       User.findOne({ email: username }, function (err, user) {
//         if (err) {
//           return done(err);
//         }
//         console.log(user);

//         if (!user) {
//           return done(null, false, { message: "Incorrect username." });
//         }
//         if (!user.validPassword(password)) {
//           return done(null, false, { message: "Incorrect password." });
//         }
//         return done(null, user);
//       });
//     }
//   )
// );
passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function (req, res) {
  Post.find({}, function (err, posts) {
    if (err) {
      console.log(err);
    } else {
      res.render("home", {
        homeStartingContent: homeStartingContent,
        posts: posts,
        user: req.user
      });
    }
  }).sort({
    date: -1,
  });
  
});

app.get("/about", function (req, res) {
  res.render("about", {
    aboutContent: aboutContent,
    user: req.user
  });
});

app.get("/contact", function (req, res) {
  res.render("contact", {
    contactContent: contactContent,
    user: req.user
  });
});

app.get("/compose", function (req, res) {
  if (req.isAuthenticated()) {
    res.render("compose", {user: req.user});
  } else {
    res.redirect("/login");
  }
});

app.get("/posts/:postId", function (req, res) {
  const id = req.params.postId;
  Post.findById(id, function (err, post) {
    if (err) {
      console.log(err);
    } else {
      res.render("post", {
        title: post.title,
        // regex replace to insert html line breaks
        content: post.content.replace(/(?:\r\n|\r|\n)/g, "<br>"),
        id: id,
        comments: post.comments,
        user: req.user
      });
    }
  });
});

app.get("/register", function (req, res) {
  res.render("register", {user: null});
});

app.get("/login", function (req, res) {
  res.render("login", {user: null});
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/register", function (req, res) {
  User.register(
    {
      email: req.body.email,
      username: req.body.username,
      role: "user",
    },
    req.body.password,
    function (err, user) {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function () {
          res.redirect("/compose");
        });
      }
    }
  );
});

app.post("/login", function (req, res) {
  // ta a dar erro - não faz login problema está em serializar user
  // teste com fpessoa@email.com 1234
  const user = new User({
    email: req.body.email,
    password: req.body.password,
  });

  // req.login comes from passportjs
  req.login(user, function (err) {
    if (err) {
      console.log(err);
    } else {
      // authenticate using the local strategy
      // this creates a session for the user
      passport.authenticate("local")(req, res, function () {
        res.redirect("/compose");
      });
    }
  });
});

app.post("/compose", function (req, res) {
  const post = new Post({
    title: req.body.postTitle || "Untitled",
    content: req.body.postBody,
  });

  post.save(function (err) {
    if (err) {
      console.log(err);
    } else {
      res.redirect("/");
    }
  });

  // posts.push(post);
});

app.post("/comment", function (req, res) {
  const postId = req.body.postId;
  Post.findById(postId, function (err, post) {
    if (err) console.log(err);
    else {
      if (post.comments.length === 0) {
        post.comments = [
          {
            user: req.body.userName,
            email: req.body.userEmail,
            date: new Date(),
            content: req.body.comment,
          },
        ];
      } else {
        post.comments.push({
          user: req.body.userName,
          email: req.body.userEmail,
          date: new Date(),
          content: req.body.comment,
        });
      }
      post.save();
    }
    res.redirect("/posts/" + postId);
  });
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});
