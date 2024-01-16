import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { LogBucket } from "./log-bucket";

export interface TgwProps {}

export class Tgw extends Construct {
  readonly tgwId: string;

  constructor(scope: Construct, id: string, props: TgwProps) {
    super(scope, id);

    const tgw = new cdk.aws_ec2.CfnTransitGateway(this, "Default", {
      amazonSideAsn: 65000,
      autoAcceptSharedAttachments: "enable",
      defaultRouteTableAssociation: "enable",
      defaultRouteTablePropagation: "enable",
      dnsSupport: "enable",
      multicastSupport: "enable",
      tags: [
        {
          key: "Name",
          value: "tgw",
        },
      ],
      vpnEcmpSupport: "enable",
    });

    this.tgwId = tgw.ref;

    const tgwFlowLogsBucket = new LogBucket(this, "TgwFlowLogsBucket", {
      bucketName: `bucket-tgw-flow-logs-${cdk.Fn.select(
        1,
        cdk.Fn.split(
          `${cdk.Stack.of(this).stackName}/`,
          cdk.Stack.of(this).stackId
        )
      )}`,
      lifecycleRules: [{ expirationDays: 180 }],
    });

    new cdk.aws_ec2.CfnFlowLog(this, "TgwFlowLogs", {
      resourceId: tgw.ref,
      resourceType: "TransitGateway",
      logDestination: tgwFlowLogsBucket.bucket.bucketArn,
      logDestinationType: "s3",
      logFormat:
        "${version} ${resource-type} ${account-id} ${tgw-id} ${tgw-attachment-id} ${tgw-src-vpc-account-id} ${tgw-dst-vpc-account-id} ${tgw-src-vpc-id} ${tgw-dst-vpc-id} ${tgw-src-subnet-id} ${tgw-dst-subnet-id} ${tgw-src-eni} ${tgw-dst-eni} ${tgw-src-az-id} ${tgw-dst-az-id} ${tgw-pair-attachment-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${log-status} ${type} ${packets-lost-no-route} ${packets-lost-blackhole} ${packets-lost-mtu-exceeded} ${packets-lost-ttl-expired} ${tcp-flags} ${region} ${flow-direction} ${pkt-src-aws-service} ${pkt-dst-aws-service}",
      maxAggregationInterval: 60,
      destinationOptions: {
        FileFormat: "plain-text",
        HiveCompatiblePartitions: false,
        PerHourPartition: true,
      },
      tags: [
        {
          key: "Name",
          value: "tgw-flow-logs",
        },
      ],
    });
  }
}
