async function loadNotificationsPreview() {
  const resp = await fetch('/not/notifications');
  if (!resp.ok) return;
  const data = await resp.json();
  const unread = data.notifications.filter(n => !n.read).length;
  document.getElementById('notif-badge').innerText = unread || '';
}

document.getElementById('notif-icon').addEventListener('click', async () => {
  const resp = await fetch('/not/notifications');
  if (!resp.ok) return;
  const { notifications } = await resp.json();
  const list = document.getElementById('notif-list');
  list.innerHTML = '';
  notifications.forEach(n => {
    const item = document.createElement('div');
    item.className = 'notification-item' + (n.read ? '' : ' unread');
    item.innerHTML = '<strong>' + n.title + '</strong><p>' + n.message + '</p><small>' + new Date(n.createdAt).toLocaleString() + '</small>';
    item.addEventListener('click', async () => {
      if (!n.read) {
        await fetch('/not/notifications/' + n._id + '/read', { method: 'PUT' });
        item.classList.remove('unread');
        loadNotificationsPreview();
      }
      if (n.link) window.location.href = n.link;
    });
    list.appendChild(item);
  });
});

document.addEventListener('DOMContentLoaded', loadNotificationsPreview);
