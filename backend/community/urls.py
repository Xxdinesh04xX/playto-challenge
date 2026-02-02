from django.urls import path

from community import views


urlpatterns = [
    path("auth/signup/", views.AuthSignupView.as_view(), name="auth-signup"),
    path("auth/login/", views.AuthLoginView.as_view(), name="auth-login"),
    path("users/lookup/", views.UserLookupView.as_view(), name="user-lookup"),
    path("users/<int:user_id>/profile/", views.UserProfileView.as_view(), name="user-profile"),
    path("posts/", views.PostListCreateView.as_view(), name="post-list-create"),
    path("posts/<int:post_id>/", views.PostDetailView.as_view(), name="post-detail"),
    path(
        "posts/<int:post_id>/comments/",
        views.PostCommentsView.as_view(),
        name="post-comments",
    ),
    path("posts/<int:post_id>/like/", views.PostLikeView.as_view(), name="post-like"),
    path(
        "comments/<int:comment_id>/like/",
        views.CommentLikeView.as_view(),
        name="comment-like",
    ),
    path("leaderboard/", views.LeaderboardView.as_view(), name="leaderboard"),
    path("notifications/", views.NotificationListView.as_view(), name="notification-list"),
    path(
        "notifications/mark-read/",
        views.NotificationMarkReadView.as_view(),
        name="notification-mark-read",
    ),
]
