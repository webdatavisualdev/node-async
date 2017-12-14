var app = angular.module("app", []);

app.controller("appCtrl", function($scope, $http) {
    $scope.data = {};

    $scope.init = function() {
        setInterval(function() {
            $http.get("test").then(function (res) {
                $scope.data = res.data;
            });
        }, 5000);
    }

    $scope.init();
});