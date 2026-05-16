```PowerShell
docker run -d --name rustfs_container -p 9000:9000 -p 9001:9001 -v "/mnt/rustfs/data:\Files\Projects\diploma\s3_data" -e RUSTFS_ACCESS_KEY=rustfsadmin -e RUSTFS_SECRET_KEY=rustfsadmin -e RUSTFS_CONSOLE_ENABLE=true rustfs/rustfs:latest --address :9000 --console-enable --access-key rustfsadmin --secret-key rustfsadmin /data
```
