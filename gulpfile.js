var gulp  = require('gulp');
var shell = require('gulp-shell');

var watcher = gulp.watch('src/**/*', ["default"]);

watcher.on("change", function(event) {
  console.log("File " + event.path + " was " + event.type + ", running tasks...");
});

gulp.task("default", ["test"] , function() {
});

gulp.task("test", ["run"] , shell.task([
  "sleep 1",
  "curl -v http://192.168.99.100/v1/1111/1111/1111"
]));

gulp.task("run", ["build"], shell.task([
  "docker-compose up -d",
  "docker logs stutzthingsapi_api_1"
]));

gulp.task("build", null, shell.task([
  "docker-compose build",
]));
