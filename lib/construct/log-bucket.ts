import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export interface LogBucketProps {
  bucketName: string;
  lifecycleRules: {
    expirationDays: number;
    prefix?: string;
    ruleNameSuffix?: string;
  }[];
}

export class LogBucket extends Construct {
  readonly bucket: cdk.aws_s3.Bucket;

  constructor(scope: Construct, id: string, props: LogBucketProps) {
    super(scope, id);

    this.bucket = new cdk.aws_s3.Bucket(this, "Default", {
      bucketName: props.bucketName,
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: new cdk.aws_s3.BlockPublicAccess({
        blockPublicAcls: true,
        blockPublicPolicy: true,
        ignorePublicAcls: true,
        restrictPublicBuckets: true,
      }),
      enforceSSL: true,
      versioned: false,
    });

    props.lifecycleRules.forEach((lifecycleRule) => {
      this.bucket.addLifecycleRule({
        enabled: true,
        id: lifecycleRule.ruleNameSuffix
          ? `Delete-After-${lifecycleRule.expirationDays}Days-${lifecycleRule.ruleNameSuffix}`
          : `Delete-After-${lifecycleRule.expirationDays}Days`,
        expiration: cdk.Duration.days(lifecycleRule.expirationDays),
        prefix: lifecycleRule.prefix,
        expiredObjectDeleteMarker: false,
      });
    });
  }
}
