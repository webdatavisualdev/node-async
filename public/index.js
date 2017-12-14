var app = angular.module("app", []);

app.controller("appCtrl", function($scope, $http) {
    $scope.data = {};
    $scope.images = [];

    $scope.init = function() {
        setInterval(function() {
            $http.get("test").then(function (res) {
                $scope.data = res.data;
            });
        }, 5000);

        $http.get("/image?mark").then(function (res) {
            $scope.images.push(res.data);
            $http.get("/image?matt").then(function (res) {
                $scope.images.push(res.data);
                $http.get("/image?jon").then(function (res) {
                    $scope.images.push(res.data);
                });
            });
        });
    }

    $scope.init();
});