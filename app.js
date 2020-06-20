const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport"),
  LocalStrategy = require("passport-local").Strategy;
const passportLocalMongoose = require("passport-local-mongoose");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");

const homeStartingContent =
  "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent =
  "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent =
  "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();

app.set("view engine", "ejs");

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);
app.use(express.static("public"));

app.use(cookieParser());
app.use(
  session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 },
  })
);

app.use(flash());

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/blogDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("useCreateIndex", true);

const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: String,
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

// setting the usernameField to be email instead of username
userSchema.plugin(passportLocalMongoose, { usernameField: "email" });

const User = new mongoose.model("User", userSchema);

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
        user: req.user,
        pageTitle: "Home",
      });
    }
  }).sort({
    date: -1,
  });
});

app.get("/about", function (req, res) {
  res.render("about", {
    aboutContent: aboutContent,
    user: req.user,
    pageTitle: "About Us",
  });
});

app.get("/contact", function (req, res) {
  res.render("contact", {
    contactContent: contactContent,
    user: req.user,
    pageTitle: "Contact Us",
  });
});

app.get("/compose", function (req, res, next) {
  if (req.isAuthenticated()) {
    if (req.user.role === "author") {
      res.render("compose", { user: req.user, pageTitle: "Compose" });
    } else {
      res.status(403);
      res.render("errors/403", { pageTitle: "403: Forbidden", user: req.user });
    }
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
      console.log(req.user);

      res.render("post", {
        title: post.title,
        // regex replace to insert html line breaks
        content: post.content.replace(/(?:\r\n|\r|\n)/g, "<br>"),
        date: post.date.toLocaleDateString("en-GB"),
        id: id,
        author: post.author,
        comments: post.comments,
        user: req.user,
        pageTitle: post.title,
      });
    }
  });
});

app.get("/register", function (req, res) {
  res.render("register", { user: null, pageTitle: "Register" });
});

app.get("/login", function (req, res) {

  const error = req.flash("error");
  console.log(error);
  
  res.render("login", {
    user: req.user,
    pageTitle: "Login",
    error: error
  });
});

app.get("/logout", function (req, res) {
  req.logout();
  res.redirect("/");
});

app.get("*", function (req, res) {
  res.status(404);
  res.render("errors/404", { pageTitle: "404: Not found", user: req.user });
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
          res.redirect("/");
        });
      }
    }
  );
});

app.post("/login", function (req, res) {

  const user = new User({
    email: req.body.email,
    password: req.body.password,
  });


  passport.authenticate("local", function (err, user) {
    if (err) {
      
      req.flash("error", err);
      res.redirect("/login");
    } else if (user) {
      req.login(user, function (err) {
        if (err) {
          req.flash("error", err);

          console.log(err);
          res.redirect("/login");
        } else {
          console.log("tudo OK");
          res.redirect("/");
        }
      });
    } else {
      console.log("ultimo else");
      
      req.flash("error", "Invalid user or password");
      res.redirect("/login");
    }
  })(req, res);

});

app.post("/compose", function (req, res) {
  const post = new Post({
    title: req.body.postTitle || "Untitled",
    content: req.body.postBody,
    author: req.user.username,
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
