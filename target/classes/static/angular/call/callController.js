/*
 * @author Micael Gallego (micael.gallego@gmail.com)
 * @author Raquel Díaz González
 */

kurento_room.controller('callController', function ($scope, $rootScope, $routeParams, $http,$timeout, $window, ServiceParticipant, ServiceRoom, Fullscreen, LxNotificationService) {
    /*
    $scope.roomName = ServiceRoom.getRoomName();
    $scope.userName = ServiceRoom.getUserName();
    $scope.participants = ServiceParticipant.getParticipants();
    $scope.kurento = ServiceRoom.getKurento();
    */

    $rootScope.isParticipant = false;
    $scope.isItemFullShow = false;
    $scope.isFullScreen = false;
    $scope.isConnect = false;
    $scope.minutesLabel = document.getElementById("minutes");
    $scope.secondsLabel = document.getElementById("seconds");
    $scope.totalSeconds = 0;
    $scope.timerHandler;
    $scope.localStream;
    $scope.room;

    // count up timer
    $scope.initTimer = function () {
        $scope.totalSeconds = 0;
        $scope.timerHandler = setInterval(setTime, 1000);

    }
    function setTime()
        {
            ++$scope.totalSeconds;
            $scope.secondsLabel.innerHTML = pad($scope.totalSeconds%60);
            $scope.minutesLabel.innerHTML = pad(parseInt($scope.totalSeconds/60));
        }

    function pad(val)
        {
            var valString = val + "";
            if(valString.length < 2)
            {
                return "0" + valString;
            }
            else
            {
                return valString;
            }
        }


    var contextpath = (location.pathname == '/') ? '' : location.pathname;

    $rootScope.contextpath = (location.pathname == '/') ? '' : location.pathname;

    var roomsFragment = $rootScope.contextpath.endsWith('/') ? '#/rooms/' : '/#/rooms/';
    $scope.clientConfig = {'loopbackRemote':false,'loopbackAndLocal':false};
    $http.get($rootScope.contextpath + '/getAllRooms').success(function(data, status, headers, config) {
        console.log(JSON.stringify(data));
        $scope.listRooms = data;
    }).error(function(data, status, headers, config) {});

    $http.get($rootScope.contextpath + '/getClientConfig').success(function(data, status, headers, config) {
        console.log(JSON.stringify(data));
        $scope.clientConfig = data;
    }).error(function(data, status, headers, config) {});

    $http.get($rootScope.contextpath + '/getUpdateSpeakerInterval').success(function(data, status, headers, config) {
        $scope.updateSpeakerInterval = data;
    }).error(function(data, status, headers, config) {});

    $http.get($rootScope.contextpath + '/getThresholdSpeaker').success(function(data, status, headers, config) {
        $scope.thresholdSpeaker = data;
        $scope.register();
    }).error(function(data, status, headers, config) {});


    console.log('route_params ============================>' + $routeParams.room + '==================>' + $routeParams.name);
    $scope.initParams = function () {
        $scope.roomName = ServiceRoom.getRoomName();
        $scope.userName = ServiceRoom.getUserName();
        $scope.participants = ServiceParticipant.getParticipants();
        $scope.kurento = ServiceRoom.getKurento();
    };

    $scope.leaveRoom = function () {

        //ServiceRoom.getKurento().close();

        //ServiceParticipant.removeParticipants();
        //ServiceParticipant.removeParticipantByStream($scope.localStream);
        $scope.room.disconnect($scope.localStream);
        //$scope.localStream.unpublish();
        $('#video-' + $scope.userName + '_webcam').addClass('hidden');
	$('#video-' + $scope.userName + '_webcam').remove();
        $scope.onOffVideocam();
        $scope.onOffVolume();
        clearInterval($scope.timerHandler);
        $scope.isConnect = false;
    };

    $scope.connectRoom = function () {
        //$scope.room.connect();
        $scope.localStream.init();
/*
        $('#video-' + $scope.userName + '_webcam').removeClass('hidden');
        $scope.onOffVideocam();
        $scope.onOffVolume();
*/
        $scope.isConnect = true;
        $scope.initTimer();

    };

    window.onbeforeunload = function () {
        //not necessary if not connected
        if (ServiceParticipant.isConnected()) {
                ServiceRoom.getKurento().close();
        }
    };


    $scope.goFullscreen = function () {
        $scope.isItemFullShow = false;
        if (Fullscreen.isEnabled())
            Fullscreen.cancel();
        else{
            Fullscreen.all();
        }
    };

    $scope.onOffVolume = function () {
        var localStream = ServiceRoom.getLocalStream();
        var element = document.getElementById("buttonVolume");
        if (element.classList.contains("fa-microphone-slash")) { //on
            element.classList.remove("fa-microphone-slash");
            element.classList.add("fa-microphone");
            localStream.audioEnabled = true;
        } else { //off
            element.classList.remove("fa-microphone");
            element.classList.add("fa-microphone-slash");
            localStream.audioEnabled = false;

        }
    };

    $scope.onOffVideocam = function () {
        var localStream = ServiceRoom.getLocalStream();
        var element = document.getElementById("buttonVideocam");
        if (element.classList.contains("md-videocam-off")) {//on
            element.classList.remove("md-videocam-off");
            element.classList.add("md-videocam");
            localStream.videoEnabled = true;
        } else {//off
            element.classList.remove("md-videocam");
            element.classList.add("md-videocam-off");
            localStream.videoEnabled = false;
        }
    };

    $scope.initLocalStream = function () {
        $scope.onOffVolume();
        $scope.onOffVideocam();
        $('#video-' + $scope.userName + '_webcam').addClass('hidden');
    }
    //chat
    $scope.message;

    $scope.sendMessage = function () {
        console.log("Sending message", $scope.message);
        var kurento = ServiceRoom.getKurento();
        kurento.sendMessage($scope.roomName, $scope.userName, $scope.message);
        $scope.message = "";
    };

    //open or close chat when click in chat button
    $scope.toggleChat = function () {
        var selectedEffect = "slide";
        // most effect types need no options passed by default
        var options = {direction: "right"};
        if ($("#effect").is(':visible')) {
            $("#content").animate({width: '100%'}, 500);
        } else {
            $("#content").animate({width: '80%'}, 500);
        }
        // run the effect
        $("#effect").toggle(selectedEffect, options, 500);
    };

    $scope.register = function() {

        $scope.userName = $routeParams.name;
        $scope.roomName = $routeParams.room;

        var wsUri = 'wss://' + location.host + $rootScope.contextpath + '/room';

        //show loopback stream from server
        var displayPublished = $scope.clientConfig.loopbackRemote || false;
        //also show local stream when display my remote
        var mirrorLocal = $scope.clientConfig.loopbackAndLocal || false;

        var kurento = KurentoRoom(wsUri, function(error, kurento) {
            $scope.tempKurento = kurento;

            if (error) {
                return console.error('Error in KurentoRoom client', error);
            }

            //TODO token should be generated by the server or a 3rd-party component  
            //kurento.setRpcParams({token : "securityToken"});

            room = kurento.Room({
                room: $scope.roomName,
                user: $scope.userName,
                updateSpeakerInterval: $scope.updateSpeakerInterval,
                thresholdSpeaker: $scope.thresholdSpeaker
            });

            var localStream = kurento.Stream(room, {
                audio: true,
                video: true,
                data: false
            });

            localStream.addEventListener("access-accepted", function() {
                if (displayPublished) {
                    localStream.subscribeToMyRemote();
                }
                localStream.publish();
                ServiceRoom.setLocalStream(localStream.getWebRtcPeer());
                $scope.localStream = localStream;
            });

                room.addEventListener("room-connected", function(roomEvent) {
                    var streams = roomEvent.streams;
                    /*if (displayPublished) {
                        localStream.subscribeToMyRemote();
                    }
                    localStream.publish();
                    ServiceRoom.setLocalStream(localStream.getWebRtcPeer());
                    */
                    for (var i = 0; i < streams.length; i++) {
                        ServiceParticipant.addParticipant(streams[i]);
                    }
                    //$scope.localStream = localStream;

                });

                room.addEventListener("stream-published", function(streamEvent) {
                    ServiceParticipant.addLocalParticipant(localStream);
                    if (mirrorLocal && localStream.displayMyRemote()) {
                        var localVideo = kurento.Stream(room, {
                            video: true,
                            id: "localStream"
                        });
                        localVideo.mirrorLocalStream(localStream.getWrStream());
                        ServiceParticipant.addLocalMirror(localVideo);
                    }
//                  $scope.initLocalStream();
                });

                room.addEventListener("stream-added", function(streamEvent) {
                    ServiceParticipant.addParticipant(streamEvent.stream);
                });

                room.addEventListener("stream-removed", function(streamEvent) {
                    ServiceParticipant.removeParticipantByStream(streamEvent.stream);
                });

                room.addEventListener("newMessage", function(msg) {
                    ServiceParticipant.showMessage(msg.room, msg.user, msg.message);
                });

                room.addEventListener("error-room", function(error) {
                    ServiceParticipant.showError($window, LxNotificationService, error, contextpath);
                });

                room.addEventListener("error-media", function(msg) {
                    ServiceParticipant.alertMediaError($window, LxNotificationService, msg.error, contextPath, function(answer) {
                        console.warn("Leave room because of error: " + answer);
                        if (answer) {
                            kurento.close(true);
                        }
                    });
                });

                room.addEventListener("room-closed", function(msg) {
                    if (msg.room !== $scope.roomName) {
                        console.error("Closed room name doesn't match this room's name",
                            msg.room, $scope.roomName);
                    } else {
                        kurento.close(true);
                        ServiceParticipant.forceClose($window, LxNotificationService, 'Room ' +
                            msg.room + ' has been forcibly closed from server', contextpath);
                    }
                });

                room.addEventListener("lost-connection", function(msg) {
                    kurento.close(true);
                    ServiceParticipant.forceClose($window, LxNotificationService,
                        'Lost connection with room "' + msg.room +
                        '". Please try reloading the webpage...');
                }, contextpath);

                room.addEventListener("stream-stopped-speaking", function(participantId) {
                    ServiceParticipant.streamStoppedSpeaking(participantId);
                });

                room.addEventListener("stream-speaking", function(participantId) {
                    ServiceParticipant.streamSpeaking(participantId);
                });

                room.addEventListener("update-main-speaker", function(participantId) {
                    ServiceParticipant.updateMainSpeaker(participantId);
                });

                room.addEventListener("custom-message-received", function(data) {
                    if (data.params.MarkerFilterState !== undefined) {
                        ServiceParticipant.changeMarkerFilterStatus(data.params.MarkerFilterState);
                    }
                });

                room.addEventListener("participant-published", function(data) {
                        var a;
                });

                room.connect();
                $scope.room = room;
//              });

            localStream.addEventListener("access-denied", function() {
               ServiceParticipant.showError($window, LxNotificationService, {
                    error: {
                        message: "Access not granted to camera and microphone"
                    }
                });
            }, contextpath);
//            localStream.init();
            $scope.localStream = localStream;
        });

        //save kurento & roomName & userName in service
        ServiceRoom.setKurento(kurento);
        ServiceRoom.setRoomName($scope.roomName);
        ServiceRoom.setUserName($scope.userName);

        //ServiceRoom.setFilterRequestParam($scope.clientConfig.filterRequestParam);

        $rootScope.isParticipant = true;

        $scope.initParams();
    };


/*    document.addEventListener("fullscreenchange", function(event) {
//    $(document).keyup(function (e) {
//      console.log('keyup============>' + e.which);
        if(e.which == 27 && $scope.isItemFullShow == true) {
            $('#main-video').addClass('hidden');
            $scope.isItemFullShow = false;
        }
    });
*/

    if (document.addEventListener)
    {
        document.addEventListener('webkitfullscreenchange', exitHandler, false);
        document.addEventListener('mozfullscreenchange', exitHandler, false);
        document.addEventListener('fullscreenchange', exitHandler, false);
        document.addEventListener('MSFullscreenChange', exitHandler, false);
    }

    function exitHandler()
    {
        if (document.webkitIsFullScreen || document.mozFullScreen || document.msFullscreenElement !== null)
        {
        /* Run code on exit */
            if($scope.isItemFullShow === true && $scope.isFullScreen === true) {
                $('#main-video').addClass('hidden');
                $scope.isItemFullShow = false;
                $scope.isFullScreen = false;

            } else
                $scope.isFullScreen = !$scope.isFullScreen;
        }
    }
    $(document).off('click', '.j-item-fullscreen');
    $(document).on('click', '.j-item-fullscreen', function(e) {
        $scope.isItemFullShow = true;
        $("#main-video").removeClass("hidden");
        if (Fullscreen.isEnabled())
            Fullscreen.cancel();
        else {
            Fullscreen.all();
        }
    });

});

